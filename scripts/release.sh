#!/bin/bash

set -xeu

rootdir=$(realpath $(dirname $0)/..)
uploader_filename=price-pivot-${VERSION}

pushd ${rootdir}

git_email=$(git config user.email)
git_name=$(git config user.name)

upload_dir=$(mktemp --tmpdir -d upload.XXXX)

function finish {
  rm -rf ${upload_dir}
}
trap finish EXIT ERR

echo ${VERSION} > ${upload_dir}/version.txt
(cd dist && tar czvf ${upload_dir}/${uploader_filename}.tar.gz ./)
(cd ${upload_dir} && sha256sum ${uploader_filename}.tar.gz > sha256sum.txt)

gh release create v${VERSION} \
    --draft \
    --generate-notes \
    --latest \
    ${upload_dir}/*
