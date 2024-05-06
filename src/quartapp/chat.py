import asyncio
import json, os
from quart import Blueprint, jsonify, request, Response, render_template, current_app

from azure.ai.assistant.management.async_chat_assistant_client import AsyncChatAssistantClient
from azure.ai.assistant.management.ai_client_factory import AsyncAIClientType
from azure.ai.assistant.management.async_assistant_client_callbacks import AsyncAssistantClientCallbacks
from azure.ai.assistant.management.async_conversation_thread_client import AsyncConversationThreadClient


bp = Blueprint("chat", __name__, template_folder="templates", static_folder="static")
user_queues = {}

class MyAssistantClientCallbacks(AsyncAssistantClientCallbacks):
    def __init__(self, message_queue):
        super().__init__()
        self.message_queue = message_queue

    async def on_run_update(self, assistant_name, run_identifier, run_status, thread_name, is_first_message=False, message=None):
        if run_status == "streaming":
            current_app.logger.info(f"Stream message: {message}")
            #action = "start" if is_first_message else "message"
            await self.message_queue.put(("message", message))
        elif run_status == "completed":
            current_app.logger.info(f"Run completed with status: {run_status}")
            await self.message_queue.put(("end", run_status))
    #async def on_run_end(self, assistant_name, run_identifier, run_end_time, run_status, thread_name):
    #    current_app.logger.info(f"Run ended with status: {run_status}")
    #    await self.message_queue.put(("end", run_status))

    async def on_function_call_processed(self, assistant_name, run_identifier, function_name, arguments, response):
        await self.message_queue.put(("function", function_name))

async def read_config(assistant_name):
    config_path = f"config/{assistant_name}_assistant_config.yaml"
    try:
        # Log the current directory and its contents
        current_directory = os.getcwd()
        directory_contents = os.listdir(current_directory)
        current_app.logger.info(f"Current directory: {current_directory}")
        current_app.logger.info(f"Directory contents: {directory_contents}")

        # Attempt to read the configuration file
        current_app.logger.info(f"Reading assistant configuration from {config_path}")
        with open(config_path, "r") as file:
            content = file.read()
            current_app.logger.info(f"file contents: {content}")
            return content
    except FileNotFoundError as e:
        current_app.logger.error(f"Configuration file not found at {config_path}: {e}")
        return None
    except Exception as e:
        current_app.logger.error(f"An error occurred: {e}")
        return None

@bp.before_app_serving
async def configure_assistant_client():
    config = await read_config("PetTravelPlanChatAssistant")
    if config:
        # Create a new message queue for this session
        message_queue = asyncio.Queue()
        
        # Initialize callbacks with the created message queue
        callbacks = MyAssistantClientCallbacks(message_queue)

        api_version = os.getenv("AZURE_OPENAI_API_VERSION")
        current_app.logger.info(f"Initializing AsyncChatAssistantClient with callbacks, api_version: {api_version}")

        bp.assistant_client = await AsyncChatAssistantClient.from_yaml(config, callbacks=callbacks)
        current_app.logger.info("AsyncChatAssistantClient has been initialized with callbacks")

        ai_client_type = AsyncAIClientType[bp.assistant_client.assistant_config.ai_client_type]
        bp.conversation_thread_client = AsyncConversationThreadClient.get_instance(ai_client_type)
        
        # Create a new conversation thread and store its name
        bp.thread_name = await bp.conversation_thread_client.create_conversation_thread()
        current_app.logger.info(f"Conversation thread created with name: {bp.thread_name}")
        
        # Store the message queue for this thread name in the global dictionary
        user_queues[bp.thread_name] = message_queue
    else:
        current_app.logger.error("Assistant configuration not found")
        raise FileNotFoundError("Assistant configuration not found")

@bp.after_app_serving
async def shutdown_assistant_client():
    # Properly close the AsyncChatAssistantClient
    if hasattr(bp, 'conversation_thread_client'):
        await bp.conversation_thread_client.close()
        current_app.logger.info("AsyncChatAssistantClient has been closed")

@bp.get("/")
async def index():
    return await render_template("index.html")

@bp.post("/chat")
async def start_chat():
    user_message = await request.get_json()
    if not hasattr(bp, 'assistant_client'):
        return jsonify({"error": "Assistant client is not initialized"}), 500

    if not hasattr(bp, 'thread_name'):
        return jsonify({"error": "Conversation thread is not initialized"}), 500

    # Send user message to the conversation thread
    await bp.conversation_thread_client.create_conversation_thread_message(user_message['message'], bp.thread_name)
    #await bp.assistant_client.process_messages(thread_name=bp.thread_name, stream=True)
    # Process messages in the background, do not await here
    asyncio.create_task(
        bp.assistant_client.process_messages(thread_name=bp.thread_name, stream=True)
    )

    return jsonify({"thread_name": bp.thread_name, "message": "Processing started"}), 200

@bp.route('/keep-alive', methods=['POST'])
async def keep_alive():
    # Respond with an empty message to indicate that the connection is still active
    return Response("", status=200)

@bp.route('/stream/<thread_name>', methods=['GET'])
async def stream_responses(thread_name):
    # Set necessary headers for SSE
    headers = {
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Content-Type': 'text/event-stream'
    }

    current_app.logger.info(f"Stream request received for thread: {thread_name}")

    if thread_name != bp.thread_name:
        current_app.logger.error(f"Invalid thread name: {thread_name} does not match {bp.thread_name}")
        return jsonify({"error": "Invalid thread name"}), 404

    message_queue = user_queues.get(thread_name)
    if not message_queue:
        current_app.logger.error(f"No active session found for thread: {thread_name}")
        return jsonify({"error": "No active session for this thread"}), 404

    current_app.logger.info(f"Starting to stream events for thread: {thread_name}")

    async def event_stream():
        try:
            while True:
                message_type, message = await message_queue.get()

                if message_type == "message":
                    event_data = json.dumps({'content': message})
                    yield f"data: {event_data}\n\n"

                elif message_type == "end":
                    end_message = "StreamEnd"
                    event_data = json.dumps({'content': end_message})
                    yield f"data: {event_data}\n\n"
                    return  # This will end the function and thus the stream

                elif message_type == "function":
                    function_message = f"Function {message} called"
                    event_data = json.dumps({'content': function_message})
                    yield f"data: {event_data}\n\n"

                message_queue.task_done()

        except asyncio.CancelledError:
            raise
        except Exception as e:
            raise
        finally:
            pass

    return Response(event_stream(), headers=headers)
