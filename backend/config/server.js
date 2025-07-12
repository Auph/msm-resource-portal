module.exports = ({ env }) => ({
  host: env('HOST', 'https://content.msmusic.edu.sg'),
  port: env.int('PORT', 1337),
  app: {
    keys: env.array('APP_KEYS'),
  },
});
