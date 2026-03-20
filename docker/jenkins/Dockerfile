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
# NOTE: Acceptable for local dev. Production Jenkins should use official Node.js Docker image.
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Fix docker socket permission
RUN groupadd -f docker && usermod -aG docker jenkins

USER jenkins

ENV JENKINS_UC=https://updates.jenkins.io
ENV JENKINS_UC_DOWNLOAD=https://updates.jenkins.io/download

# Skip setup wizard + tạo admin user tự động
ENV JAVA_OPTS="-Djenkins.install.runSetupWizard=false"

# Cài plugin lúc build (đảm bảo plugin luôn có sẵn khi khởi động)
COPY plugins.txt /usr/share/jenkins/ref/plugins.txt
RUN jenkins-plugin-cli --plugin-file /usr/share/jenkins/ref/plugins.txt

COPY init-admin.groovy /usr/share/jenkins/ref/init.groovy.d/
