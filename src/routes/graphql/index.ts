import { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { createGqlResponseSchema, gqlResponseSchema, prisma } from './schemas.js';
import { graphql, validate, parse } from 'graphql';
import { schema } from './schemas.js';
import depthLimit from 'graphql-depth-limit';

const plugin: FastifyPluginAsyncTypebox = async (fastify) => {
  fastify.route({
    url: '/',
    method: 'POST',
    schema: {
      ...createGqlResponseSchema,
      response: {
        200: gqlResponseSchema,
      },
    },
    async handler(req) {
      const { query, variables } = req.body;
      const validationErrors = validate(schema, parse(query), [depthLimit(5)]);
      if (validationErrors.length > 0) {
        return { errors: validationErrors };
      }
      console.log('query');
      console.log(query);
      const result = await graphql({
        schema,
        source: query,
        variableValues: variables,
        contextValue: {
          prisma,
        },
      });
      console.log('result');
      console.log(result);
      return result;
    },
  });
};

export default plugin;
