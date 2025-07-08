// module.exports = ({ env }) => ({
//   defaultConnection: 'default',
//   connections: {
//     default: {
//       connector: 'bookshelf',
//       settings: {
//         client: 'postgres',
//         host: env('DATABASE_HOST', 'db-postgresql-resource-portal-do-user-8074699-0.a.db.ondigitalocean.com'),
//         port: env.int('DATABASE_PORT', 25060),
//         database: env('DATABASE_NAME', 'resource-portal'),
//         username: env('DATABASE_USERNAME', 'nnHLcNTLybGHPRPY'),
//         password: env('DATABASE_PASSWORD', 'ignjo7zbkfj7h0v0'),
//         ssl: {
//           rejectUnauthorized: false,
//         },
//       },
//       options: {},
//     },
//   },
// });


module.exports = ({ env }) => ({
  defaultConnection: 'default',
  connections: {
    default: {
      connector: 'bookshelf',
      settings: {
        client: 'postgres',
        host: env('DATABASE_HOST', 'localhost'),
        port: env.int('DATABASE_PORT', 5432),
        database: env('DATABASE_NAME', 'resource-portal'),
        username: env('DATABASE_USERNAME', 'postgres'),
        password: env('DATABASE_PASSWORD', 'Pronet97?'),
        ssl: false,
      },
      options: {}
    },
  },
});
