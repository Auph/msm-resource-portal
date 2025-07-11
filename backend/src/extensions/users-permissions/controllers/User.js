const { sanitizeEntity } = require('strapi-utils');

const sanitizeUser = user =>
  sanitizeEntity(user, {
    model: strapi.query('user', 'users-permissions').model,
  });

module.exports = {

  async register(ctx) {
    const { email, username, password, firstName, lastName, interests } = ctx.request.body;

    if (!email || !password || !username || !firstName || !lastName) {
      return ctx.badRequest('Missing required fields');
    }

    // Check if user already exists
    const existingUser = await strapi
      .plugin('users-permissions')
      .service('user')
      .getUserByEmail(email);

    if (existingUser) {
      return ctx.badRequest('Email already in use');
    }

    // Hash the password
    const hashedPassword = await strapi
      .plugin('users-permissions')
      .service('user')
      .hashPassword(password);

    // Create user manually with all fields
    const newUser = await strapi
      .documents('plugin::users-permissions.user')
      .create({
        data: {
          email,
          username,
          password: hashedPassword,
          confirmed: false, // Or true if you want to skip email verification
          firstName,
          lastName,
          interests,
        },
      });

    // Optional: send confirmation email manually
    await strapi
      .plugin('users-permissions')
      .service('user')
      .sendConfirmationEmail(newUser);

    const sanitized = await strapi
      .plugin('users-permissions')
      .service('user')
      .sanitizeOutput(newUser, ctx);

    return ctx.created(sanitized);
  },

  async me(ctx) {
    const user = ctx.state.user;

    if (!user) {
      return ctx.badRequest(null, [
        { messages: [{ id: 'No authorization header was found' }] },
      ]);
    }

    const userQuery = await strapi.query('user', 'users-permissions');
    const userWithMedia = await userQuery.findOne({ id: ctx.state.user.id });
    const data = sanitizeUser(userWithMedia, { model: userQuery.model });
    ctx.send(data);
  },
};