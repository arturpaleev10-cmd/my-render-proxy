FROM ubuntu:latest

RUN apt-get update && apt-get install -y squid apache2-utils && rm -rf /var/lib/apt/lists/*

# Пользователь прокси
RUN htpasswd -cb /etc/squid/passwords user password

# Полностью перезаписываем конфиг Squid, оставляем только порт 8080
RUN printf 'http_port 8080\n' > /etc/squid/squid.conf && \
    printf 'auth_param basic program /usr/lib/squid/basic_ncsa_auth /etc/squid/passwords\n' >> /etc/squid/squid.conf && \
    printf 'auth_param basic realm proxy\n' >> /etc/squid/squid.conf && \
    printf 'acl authenticated proxy_auth REQUIRED\n' >> /etc/squid/squid.conf && \
    printf 'http_access allow authenticated\n' >> /etc/squid/squid.conf && \
    printf 'http_access deny all\n' >> /etc/squid/squid.conf && \
    printf 'forwarded_for off\n' >> /etc/squid/squid.conf && \
    printf 'via off\n' >> /etc/squid/squid.conf && \
    printf 'coredump_dir /var/spool/squid\n' >> /etc/squid/squid.conf && \
    printf 'cache deny all\n' >> /etc/squid/squid.conf

# Удаляем дефолтный debian.conf, чтобы он не добавлял порт 3128
RUN rm -f /etc/squid/conf.d/debian.conf

EXPOSE 8080

CMD ["squid", "-N", "-d1"]
