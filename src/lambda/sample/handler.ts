import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  console.log('Event:', JSON.stringify(event, null, 2));

  try {
    // リクエストボディの取得
    const body = event.body ? JSON.parse(event.body) : {};
    
    // クエリパラメータの取得
    const queryParams = event.queryStringParameters || {};
    
    // パスパラメータの取得
    const pathParams = event.pathParameters || {};

    // サンプルレスポンス
    const response = {
      message: 'Hello from Lambda!',
      method: event.httpMethod,
      path: event.path,
      queryParams,
      pathParams,
      body,
      timestamp: new Date().toISOString()
    };

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
      },
      body: JSON.stringify(response)
    };
  } catch (error) {
    console.error('Error:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};
