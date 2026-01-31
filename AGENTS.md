# Project Overview
This repo contains interactive web pages and learning materials. The main shared UI/logic lives in `assets/` and is used by the HTML pages in the content folders.

# SCORM Packaging
Use `scripts/build-scorm.ps1` to create SCORM ZIPs from a single HTML file. It rewrites asset paths, copies `assets/`, and generates `imsmanifest.xml` from `scripts/imsmanifest.template.xml`.

# Encoding
All files are UTF-8. Any tool that reads or writes project files must preserve UTF-8 encoding.
