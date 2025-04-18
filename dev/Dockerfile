FROM postgres:16
RUN apt-get update -y && \
  apt-get install -y wget tar && \
  wget https://github.com/golang-migrate/migrate/releases/download/v4.15.1/migrate.linux-amd64.tar.gz && \
  tar -xzf migrate.linux-amd64.tar.gz && \
  mv migrate /usr/local/bin

COPY env /env
COPY dev/postgres-migration/migrate.sh .
COPY migration /migration

ENTRYPOINT [ "./migrate.sh" ]
