#!/bin/bash

set -e

PACKAGE="yuow"

# Get the version currently tagged as "alpha"
ALPHA_VERSION=$(npm dist-tag ls $PACKAGE | grep 'alpha:' | awk '{print $2}')

if [ -z "$ALPHA_VERSION" ]; then
  echo "No alpha version found for $PACKAGE"
  exit 1
fi

echo "Current alpha version: $ALPHA_VERSION"

# Tag the alpha version as "latest"
npm dist-tag add $PACKAGE@$ALPHA_VERSION latest
echo "Tagged $PACKAGE@$ALPHA_VERSION as latest"