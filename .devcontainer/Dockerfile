FROM node:18.17.1-bullseye

RUN apt-get update && \
      apt-get -y install sudo

RUN echo "node:node" | chpasswd && adduser node sudo

RUN echo "node ALL=(ALL:ALL) NOPASSWD: ALL" | sudo tee /etc/sudoers.d/node