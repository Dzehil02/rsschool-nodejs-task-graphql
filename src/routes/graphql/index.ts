import { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { createGqlResponseSchema, gqlResponseSchema, rootValue } from './schemas.js';
import { graphql } from 'graphql';
import {schema} from './schemas.js';


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
      console.log('query');
      console.log(query);
      const result = await graphql({
        schema,
        source: query,
        rootValue: rootValue,
        variableValues: variables,
      });
      console.log('result');
      console.log(result);
      return result;
    },
  });
};

export default plugin;
