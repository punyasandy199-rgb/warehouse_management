#!/usr/bin/env python3
import os
import zipfile

base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
dist_dir = os.path.join(base_dir, 'dist')
out_public = os.path.join(base_dir, 'public', 'sikutang_deploy_ready.zip')
out_dist = os.path.join(base_dir, 'dist', 'sikutang_deploy_ready.zip')

if not os.path.exists(dist_dir):
    print("dist folder does not exist")
    exit(0)

os.makedirs(os.path.join(base_dir, 'public'), exist_ok=True)

# Create zip file
for out_path in [out_public, out_dist]:
    with zipfile.ZipFile(out_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk(dist_dir):
            for file in files:
                if file.endswith('.zip') or file.endswith('sikutang_wms_standalone.html'):
                    continue
                file_path = os.path.join(root, file)
                arcname = os.path.relpath(file_path, dist_dir)
                zipf.write(file_path, arcname)

print(f"Deploy zip generated: {out_public} ({os.path.getsize(out_public)} bytes)")
