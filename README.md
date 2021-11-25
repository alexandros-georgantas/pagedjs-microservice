# PagedJS service

## The service

This standalone service exposes the functionality of converting an html file into pdf and also preview of an html file via using the pagedjs previewer. The API offered is as follows:

- `POST /api/auth`
- `POST /api/htmlToPDF`
- `GET /api/getPreviewerLink`

1. As this service is meant to be from many clients, the first endpoint allows clients to acquire their access tokens in order to be able to use the service\*. A call to the `api/auth` endpoint considered valid if it contains the Authorization header with value `Basic base64encoded(clientId:clientSecret)`.  
   The response of a valid call to the `api/auth` will return an `accessToken`\*\* (JWT)
2. A call to the `api/htmlToPDF` in order to be considered valid should have the `Authorization` property in its headers with value `Bearer <the value of an accessToken provided by this service>`. The property `Content-Type` should be `multipart/form-data` and finally the body should contain the actual html file under a form field called `zip`. Additional body options are `imagesForm` and `onlySourceStylesheet`. The `imagesForm` should be set to `base64` if the included images in the `HTML` content are encoded in `base64` format. The `onlySourceStylesheet` option should be set to `true` if the calling application requires only the provided stylesheet to be included in the conversion to PDF process (without this flag two additional stylesheets are included by default, one of the highlight.js library and one for the katex.js library)
   The response of this endpoint will be a file stream containing the actual pdf file which was created or a `JSON` if any errors occurred.
3. A call to the `api/getPreviewerLink` in order to be considered valid should have the `Authorization` property in its headers with value `Bearer <the value of an accessToken provided by this service>`. The property `Content-Type` should be `multipart/form-data` and finally the body should contain a zip file which will have the html which should be previewed, a css file and possible any font files referenced in the css file.
   The response of this endpoint will be a `JSON` object with one property call `link` which will present the link of the html preview in pagedjs, or a `msg` property if any errors occurred

\*client's registration required beforehand  
\*\*the life span of an accessToken is 8 hours

## Starting the service

The service is fully dockerized for ease of use for either development or for use in production.

### Development

In the root of the service run `docker-compose up`  
This container includes the actual service as well as a Postgres DB

### Production

In the root of the service run `docker-compose -f docker-compose.production.yml up`
This container contains just the service. An external Postgres DB should be provided.

### Required env variables

```
PUBSWEET_SECRET
SERVER_PORT
SERVER_HOST
SERVER_PROTOCOL
POSTGRES_USER
POSTGRES_PASSWORD
POSTGRES_HOST
POSTGRES_DB
POSTGRES_PORT
NODE_ENV=production
```

All the above are required

## Creating client's credentials

When the service is up by executing `docker exec -it <name_of_the_pagedjs_server_container> yarn create:client`.  
The above will produce a valid pair of clientId and clientSecret
