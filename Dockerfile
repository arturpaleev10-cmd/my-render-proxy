FROM ubuntu:latest

RUN apt-get update && apt-get install -y squid apache2-utils && rm -rf /var/lib/apt/lists/*

# Создаём пользователя прокси
RUN htpasswd -cb /etc/squid/passwords user password

# Пишем чистый конфиг Squid только с портом 8080 (без 3128)
RUN echo "http_port 8080" > /etc/squid/squid.conf && \
    echo "auth_param basic program /usr/lib/squid/basic_ncsa_auth /etc/squid/passwords" >> /etc/squid/squid.conf && \
    echo "auth_param basic realm proxy" >> /etc/squid/squid.conf && \
    echo "acl authenticated proxy_auth REQUIRED" >> /etc/squid/squid.conf && \
    echo "http_access allow authenticated" >> /etc/squid/squid.conf && \
    echo "http_access deny all" >> /etc/squid/squid.conf && \
    echo "forwarded_for off" >> /etc/squid/squid.conf && \
    echo "via off" >> /etc/squid/squid.conf

EXPOSE 8080

CMD ["squid", "-N", "-d1"]
