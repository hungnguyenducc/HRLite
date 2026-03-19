FROM jenkins/jenkins:lts-jdk17

USER root

# Install Docker CLI + Compose
RUN apt-get update && \
    apt-get install -y ca-certificates curl gnupg && \
    install -m 0755 -d /etc/apt/keyrings && \
    curl -fsSL https://download.docker.com/linux/debian/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg && \
    chmod a+r /etc/apt/keyrings/docker.gpg && \
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/debian bookworm stable" > /etc/apt/sources.list.d/docker.list && \
    apt-get update && \
    apt-get install -y docker-ce-cli docker-compose-plugin && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Install Node.js 20
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Fix docker socket permission
RUN groupadd -f docker && usermod -aG docker jenkins

USER jenkins

ENV JENKINS_UC=https://updates.jenkins.io
ENV JENKINS_UC_DOWNLOAD=https://updates.jenkins.io/download

RUN jenkins-plugin-cli --plugins \
    workflow-aggregator \
    pipeline-stage-view \
    git \
    nodejs \
    junit \
    htmlpublisher \
    docker-workflow
