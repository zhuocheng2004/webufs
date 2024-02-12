husky

cat <<EOF > .husky/pre-commit
npm run prettier
npm run lint
npm run build
npm run test
EOF
