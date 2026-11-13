# Gotenberg (LibreOffice DOCX -> PDF) with your custom fonts baked in.
# Deploy on Render as a separate "Web Service" (Runtime: Docker, Root Directory: gotenberg).
# Build context is this folder, so copy ../fonts here before pushing (see DEPLOYMENT.md).
FROM gotenberg/gotenberg:8
USER root
COPY fonts/ /usr/local/share/fonts/
RUN fc-cache -f || true
USER gotenberg
CMD ["gotenberg", "--api-timeout=120s"]

