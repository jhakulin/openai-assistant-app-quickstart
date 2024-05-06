# ------------------- Stage 0: Base Stage ------------------------------
FROM python:3.11-alpine AS base

# Set up the work directory
WORKDIR /code

# Install tini, a tiny init for containers
RUN apk add --update --no-cache tini

# Install required packages for building dependencies
RUN apk add gcc musl-dev python3-dev libffi-dev openssl-dev cargo pkgconfig

# Create a non-root user and group
RUN addgroup -S app && adduser -S app -G app

# ------------------- Stage 1: Build Stage ------------------------------
FROM base AS build

# Copy the Python requirements file and install dependencies
COPY requirements.txt .

RUN pip3 install -r requirements.txt

# Copy the application code to the container
COPY . .
# ------------------- Stage 2: Final Stage ------------------------------
FROM base AS final

# Copy Python runtime binaries and libraries from the build stage
COPY --from=build --chown=app:app /usr/local/lib/python3.11 /usr/local/lib/python3.11
COPY --from=build --chown=app:app /usr/local/bin /usr/local/bin

# Copy the application code with proper ownership
COPY --from=build --chown=app:app /code /code

# Switch to the non-root user
USER app

# Expose the port the app runs on
EXPOSE 50505

# Define the entry point and command to run the application
ENTRYPOINT ["tini", "gunicorn", "quartapp:create_app()"]
