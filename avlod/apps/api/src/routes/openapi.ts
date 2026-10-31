/**
 * OpenAPI 3.1 description of /api/v1, generated from the route table below.
 * Request bodies are validated at runtime by the Zod schemas in @avlod/shared;
 * the schema names are referenced in each operation's description.
 */
type Method = 'get' | 'post' | 'patch' | 'delete';
type Access = 'public' | 'auth' | 'VIEWER' | 'EDITOR' | 'ADMIN' | 'OWNER';

interface RouteDoc {
  method: Method;
  path: string;
  tag: string;
  summary: string;
  access: Access;
  body?: string;
  multipart?: boolean;
  query?: string[];
}

const F = '/families/{familyId}';

const routes: RouteDoc[] = [
  {
    method: 'get',
    path: '/health',
    tag: 'System',
    summary: 'Health check (API + database)',
    access: 'public',
  },
  {
    method: 'post',
    path: '/auth/register',
    tag: 'Auth',
    summary: 'Register and start a session',
    access: 'public',
    body: 'registerSchema',
  },
  {
    method: 'post',
    path: '/auth/login',
    tag: 'Auth',
    summary: 'Sign in (rate limited, account lockout after 5 failures)',
    access: 'public',
    body: 'loginSchema',
  },
  {
    method: 'post',
    path: '/auth/refresh',
    tag: 'Auth',
    summary: 'Rotate the HttpOnly refresh cookie and get a new access token',
    access: 'public',
  },
  {
    method: 'post',
    path: '/auth/logout',
    tag: 'Auth',
    summary: 'Revoke the current refresh session',
    access: 'public',
  },
  {
    method: 'post',
    path: '/auth/logout-all',
    tag: 'Auth',
    summary: 'Revoke every session of the user',
    access: 'auth',
  },
  {
    method: 'post',
    path: '/auth/password-reset/request',
    tag: 'Auth',
    summary: 'Email a password reset link',
    access: 'public',
    body: 'passwordResetRequestSchema',
  },
  {
    method: 'post',
    path: '/auth/password-reset/confirm',
    tag: 'Auth',
    summary: 'Set a new password with a reset token',
    access: 'public',
    body: 'passwordResetConfirmSchema',
  },
  { method: 'get', path: '/users/me', tag: 'Account', summary: 'Current user', access: 'auth' },
  {
    method: 'patch',
    path: '/users/me',
    tag: 'Account',
    summary: 'Update profile',
    access: 'auth',
    body: 'updateProfileSchema',
  },
  {
    method: 'get',
    path: '/users/me/sessions',
    tag: 'Account',
    summary: 'Active sessions',
    access: 'auth',
  },
  {
    method: 'post',
    path: '/users/me/password',
    tag: 'Account',
    summary: 'Change password (revokes other sessions)',
    access: 'auth',
    body: 'changePasswordSchema',
  },
  {
    method: 'get',
    path: '/families',
    tag: 'Families',
    summary: "Caller's family workspaces",
    access: 'auth',
  },
  {
    method: 'post',
    path: '/families',
    tag: 'Families',
    summary: 'Create a workspace (caller becomes owner)',
    access: 'auth',
    body: 'familyCreateSchema',
  },
  { method: 'get', path: F, tag: 'Families', summary: 'Workspace details', access: 'VIEWER' },
  {
    method: 'patch',
    path: F,
    tag: 'Families',
    summary: 'Rename / describe workspace',
    access: 'ADMIN',
    body: 'familyUpdateSchema',
  },
  {
    method: 'delete',
    path: F,
    tag: 'Families',
    summary: 'Archive workspace (requires { confirmName })',
    access: 'OWNER',
  },
  {
    method: 'get',
    path: `${F}/members`,
    tag: 'Members',
    summary: 'Members and roles',
    access: 'VIEWER',
  },
  {
    method: 'patch',
    path: `${F}/members/{memberId}`,
    tag: 'Members',
    summary: 'Change role / transfer ownership',
    access: 'ADMIN',
    body: 'memberRoleUpdateSchema',
  },
  {
    method: 'delete',
    path: `${F}/members/{memberId}`,
    tag: 'Members',
    summary: 'Remove member or leave',
    access: 'VIEWER',
  },
  {
    method: 'get',
    path: `${F}/audit`,
    tag: 'Members',
    summary: 'Recent audit log',
    access: 'ADMIN',
  },
  {
    method: 'get',
    path: `${F}/invitations`,
    tag: 'Invitations',
    summary: 'List invitations',
    access: 'ADMIN',
  },
  {
    method: 'post',
    path: `${F}/invitations`,
    tag: 'Invitations',
    summary: 'Invite by email (expiring link)',
    access: 'ADMIN',
    body: 'invitationCreateSchema',
  },
  {
    method: 'delete',
    path: `${F}/invitations/{invitationId}`,
    tag: 'Invitations',
    summary: 'Revoke invitation',
    access: 'ADMIN',
  },
  {
    method: 'get',
    path: '/invitations/preview/{token}',
    tag: 'Invitations',
    summary: 'Preview an invitation',
    access: 'public',
  },
  {
    method: 'post',
    path: '/invitations/accept',
    tag: 'Invitations',
    summary: 'Accept (body: { token })',
    access: 'auth',
  },
  {
    method: 'post',
    path: '/invitations/decline',
    tag: 'Invitations',
    summary: 'Decline (body: { token })',
    access: 'auth',
  },
  {
    method: 'get',
    path: `${F}/people`,
    tag: 'People',
    summary: 'People directory (paginated)',
    access: 'VIEWER',
    query: ['q', 'branch', 'sort', 'page', 'pageSize'],
  },
  {
    method: 'post',
    path: `${F}/people`,
    tag: 'People',
    summary: 'Add person, optionally linked to a relative',
    access: 'EDITOR',
    body: 'personWithRelationSchema',
  },
  {
    method: 'get',
    path: `${F}/people/{personId}`,
    tag: 'People',
    summary: 'Profile with relatives and photos',
    access: 'VIEWER',
  },
  {
    method: 'patch',
    path: `${F}/people/{personId}`,
    tag: 'People',
    summary: 'Update person',
    access: 'EDITOR',
    body: 'personUpdateSchema',
  },
  {
    method: 'delete',
    path: `${F}/people/{personId}`,
    tag: 'People',
    summary: 'Archive person (?detach=true also removes their relationships)',
    access: 'ADMIN',
    query: ['detach'],
  },
  {
    method: 'get',
    path: `${F}/branches`,
    tag: 'People',
    summary: 'Branch labels with counts',
    access: 'VIEWER',
  },
  {
    method: 'post',
    path: `${F}/people/{personId}/portrait`,
    tag: 'Media',
    summary: 'Upload portrait (image)',
    access: 'EDITOR',
    multipart: true,
  },
  {
    method: 'post',
    path: `${F}/people/{personId}/photos`,
    tag: 'Media',
    summary: 'Upload person photo',
    access: 'EDITOR',
    multipart: true,
  },
  {
    method: 'patch',
    path: `${F}/people/{personId}/photos/{photoId}`,
    tag: 'Media',
    summary: 'Caption / make portrait',
    access: 'EDITOR',
  },
  {
    method: 'delete',
    path: `${F}/people/{personId}/photos/{photoId}`,
    tag: 'Media',
    summary: 'Delete person photo',
    access: 'EDITOR',
  },
  {
    method: 'get',
    path: `${F}/media/{mediaId}`,
    tag: 'Media',
    summary: 'Fresh signed URL',
    access: 'VIEWER',
  },
  {
    method: 'post',
    path: `${F}/relationships/parents`,
    tag: 'Relationships',
    summary: 'Link parent → child (validated: no cycles/duplicates)',
    access: 'EDITOR',
    body: 'parentLinkCreateSchema',
  },
  {
    method: 'patch',
    path: `${F}/relationships/parents/{linkId}`,
    tag: 'Relationships',
    summary: 'Update link type / verification',
    access: 'EDITOR',
    body: 'parentLinkUpdateSchema',
  },
  {
    method: 'delete',
    path: `${F}/relationships/parents/{linkId}`,
    tag: 'Relationships',
    summary: 'Remove parent link',
    access: 'EDITOR',
  },
  {
    method: 'post',
    path: `${F}/relationships/unions`,
    tag: 'Relationships',
    summary: 'Record a partnership',
    access: 'EDITOR',
    body: 'unionCreateSchema',
  },
  {
    method: 'patch',
    path: `${F}/relationships/unions/{unionId}`,
    tag: 'Relationships',
    summary: 'Update partnership',
    access: 'EDITOR',
    body: 'unionUpdateSchema',
  },
  {
    method: 'delete',
    path: `${F}/relationships/unions/{unionId}`,
    tag: 'Relationships',
    summary: 'Remove partnership',
    access: 'EDITOR',
  },
  {
    method: 'get',
    path: `${F}/tree`,
    tag: 'Tree',
    summary: 'Full tree, or a window around rootId (recursive CTE)',
    access: 'VIEWER',
    query: ['rootId', 'up', 'down'],
  },
  {
    method: 'get',
    path: `${F}/search`,
    tag: 'Search',
    summary: 'Search people, memories, events',
    access: 'VIEWER',
    query: ['q', 'limit'],
  },
  {
    method: 'get',
    path: `${F}/stats`,
    tag: 'Statistics',
    summary: 'Members, generations, branches, memories',
    access: 'VIEWER',
  },
  {
    method: 'get',
    path: `${F}/memories`,
    tag: 'Memories',
    summary: 'Memories (filter by year, eventType, personId, albumId, q)',
    access: 'VIEWER',
    query: ['year', 'eventType', 'personId', 'albumId', 'q', 'page', 'pageSize'],
  },
  {
    method: 'get',
    path: `${F}/memories/years`,
    tag: 'Memories',
    summary: 'Years with memory counts',
    access: 'VIEWER',
  },
  {
    method: 'post',
    path: `${F}/memories`,
    tag: 'Memories',
    summary: 'Create memory (JSON, or multipart with `file` + `data` JSON)',
    access: 'EDITOR',
    body: 'memoryCreateSchema',
    multipart: true,
  },
  {
    method: 'get',
    path: `${F}/memories/{memoryId}`,
    tag: 'Memories',
    summary: 'Memory',
    access: 'VIEWER',
  },
  {
    method: 'patch',
    path: `${F}/memories/{memoryId}`,
    tag: 'Memories',
    summary: 'Update memory',
    access: 'EDITOR',
    body: 'memoryUpdateSchema',
  },
  {
    method: 'delete',
    path: `${F}/memories/{memoryId}`,
    tag: 'Memories',
    summary: 'Delete memory (editors: own only)',
    access: 'EDITOR',
  },
  { method: 'get', path: `${F}/albums`, tag: 'Albums', summary: 'Albums', access: 'VIEWER' },
  {
    method: 'post',
    path: `${F}/albums`,
    tag: 'Albums',
    summary: 'Create album',
    access: 'EDITOR',
    body: 'albumCreateSchema',
  },
  {
    method: 'patch',
    path: `${F}/albums/{albumId}`,
    tag: 'Albums',
    summary: 'Update album',
    access: 'EDITOR',
    body: 'albumUpdateSchema',
  },
  {
    method: 'delete',
    path: `${F}/albums/{albumId}`,
    tag: 'Albums',
    summary: 'Delete album (memories are kept)',
    access: 'ADMIN',
  },
  {
    method: 'get',
    path: `${F}/timeline`,
    tag: 'Timeline',
    summary: 'Timeline events',
    access: 'VIEWER',
    query: ['personId', 'limit'],
  },
  {
    method: 'post',
    path: `${F}/timeline`,
    tag: 'Timeline',
    summary: 'Create event',
    access: 'EDITOR',
    body: 'timelineEventCreateSchema',
  },
  {
    method: 'patch',
    path: `${F}/timeline/{eventId}`,
    tag: 'Timeline',
    summary: 'Update event',
    access: 'EDITOR',
    body: 'timelineEventUpdateSchema',
  },
  {
    method: 'delete',
    path: `${F}/timeline/{eventId}`,
    tag: 'Timeline',
    summary: 'Delete event',
    access: 'EDITOR',
  },
  {
    method: 'get',
    path: '/public/demo',
    tag: 'Public demo',
    summary: 'Fictional demo family and its statistics',
    access: 'public',
  },
  {
    method: 'get',
    path: '/public/demo/tree',
    tag: 'Public demo',
    summary: 'Demo tree (living people redacted)',
    access: 'public',
    query: ['rootId', 'up', 'down'],
  },
  {
    method: 'get',
    path: '/public/demo/people/{personId}',
    tag: 'Public demo',
    summary: 'Demo profile',
    access: 'public',
  },
  {
    method: 'get',
    path: '/public/demo/timeline',
    tag: 'Public demo',
    summary: 'Demo timeline',
    access: 'public',
  },
  {
    method: 'get',
    path: '/public/demo/memories',
    tag: 'Public demo',
    summary: 'Demo memories',
    access: 'public',
  },
];

const errorRef = { $ref: '#/components/schemas/Error' };

function operation(r: RouteDoc) {
  const params = [...r.path.matchAll(/\{(\w+)\}/g)].map((m) => ({
    name: m[1],
    in: 'path',
    required: true,
    schema: { type: 'string', format: m[1] === 'token' ? undefined : 'uuid' },
  }));
  const queryParams = (r.query ?? []).map((name) => ({
    name,
    in: 'query',
    required: false,
    schema: { type: 'string' },
  }));
  const role =
    r.access === 'public' || r.access === 'auth' ? '' : ` Requires family role ≥ ${r.access}.`;
  const responses: Record<string, unknown> = {
    '200': { description: 'Success — `{ data, meta? }`' },
    '400': {
      description: 'Validation error',
      content: { 'application/json': { schema: errorRef } },
    },
  };
  if (r.access !== 'public') {
    responses['401'] = {
      description: 'Missing or invalid access token',
      content: { 'application/json': { schema: errorRef } },
    };
    responses['403'] = {
      description: 'Insufficient role',
      content: { 'application/json': { schema: errorRef } },
    };
    responses['404'] = {
      description: 'Not found, or not a member of this family',
      content: { 'application/json': { schema: errorRef } },
    };
  }
  const requestBody = r.multipart
    ? {
        content: {
          'multipart/form-data': {
            schema: {
              type: 'object',
              properties: {
                file: { type: 'string', format: 'binary' },
                data: { type: 'string', description: 'JSON metadata' },
                caption: { type: 'string' },
              },
            },
          },
          ...(r.body
            ? { 'application/json': { schema: { type: 'object', description: `See ${r.body}` } } }
            : {}),
        },
      }
    : r.body
      ? {
          required: true,
          content: {
            'application/json': {
              schema: { type: 'object', description: `Validated by ${r.body} (@avlod/shared)` },
            },
          },
        }
      : undefined;
  return {
    tags: [r.tag],
    summary: r.summary,
    description: `${r.summary}.${role}${r.body ? ` Body schema: \`${r.body}\`.` : ''}`,
    security: r.access === 'public' ? [] : [{ bearerAuth: [] }],
    parameters: [...params, ...queryParams],
    ...(requestBody ? { requestBody } : {}),
    responses,
  };
}

const paths: Record<string, Record<string, unknown>> = {};
for (const r of routes) {
  paths[r.path] ??= {};
  paths[r.path]![r.method] = operation(r);
}

export const openApiDocument = {
  openapi: '3.1.0',
  info: {
    title: 'AVLOD API',
    version: '1.0.0',
    description:
      'Family heritage platform API. Access tokens are short-lived JWTs (Authorization: Bearer). Refresh tokens live in an HttpOnly cookie scoped to /api/v1/auth and rotate on every use.',
  },
  servers: [{ url: '/api/v1' }],
  components: {
    securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          error: {
            type: 'object',
            properties: { code: { type: 'string' }, message: { type: 'string' }, details: {} },
            required: ['code', 'message'],
          },
        },
      },
    },
  },
  paths,
};

export const documentedRoutes = routes;
