FROM ubuntu:latest

RUN apt-get update && apt-get install -y tinyproxy apache2-utils && rm -rf /var/lib/apt/lists/*

# Создаём файл с пользователем и паролем для basic auth
RUN htpasswd -cb /etc/tinyproxy/htpasswd user password

# Конфиг tinyproxy
RUN echo "Port 8080" > /etc/tinyproxy/tinyproxy.conf && \
    echo "Listen 0.0.0.0" >> /etc/tinyproxy/tinyproxy.conf && \
    echo "Timeout 600" >> /etc/tinyproxy/tinyproxy.conf && \
    echo "Allow 0.0.0.0/0" >> /etc/tinyproxy/tinyproxy.conf && \
    echo "BasicAuth /etc/tinyproxy/htpasswd" >> /etc/tinyproxy/tinyproxy.conf && \
    echo "LogLevel Info" >> /etc/tinyproxy/tinyproxy.conf && \
    echo "MaxClients 100" >> /etc/tinyproxy/tinyproxy.conf && \
    echo "ViaProxyName \"tinyproxy\"" >> /etc/tinyproxy/tinyproxy.conf

EXPOSE 8080

CMD ["tinyproxy", "-d"]
