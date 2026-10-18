npm install
copy .env.example .env
node ace generate:key
node ace codegen
node ace migration:run
node ace db:seed
npm run dev

node ace codegen
node ace migration:run
npm run dev
