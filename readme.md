# Migrating to a monorepo

### Development Installation
### in root
```
yarn set version berry
yarn
npx nodemon -x "npx @data-story/core server"
```

### in core
```
yarn tsc --watch
npx webpack --watch
```

### in ui
```
yarn tsc --watch
yarn watch:css
npx webpack --watch
```

### in client
```
yarn dev
```

### todo
- [ ] conflicting css (if client have their own tailwindcss)