let response;

const AWS = require('aws-sdk');
const ddb = new AWS.DynamoDB.DocumentClient();
const COMPETENCIES_DDB_TABLE_NAME = process.env.COMPETENCIES_DDB_TABLE_NAME; // Allows us to access the environment variables defined in the Cloudformation template

/**
 *
 * Event doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html#api-gateway-simple-proxy-for-lambda-input-format
 * @param {Object} event - API Gateway Lambda Proxy Input Format
 *
 * Context doc: https://docs.aws.amazon.com/lambda/latest/dg/nodejs-prog-model-context.html 
 * @param {Object} context
 *
 * Return doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html
 * @returns {Object} object - API Gateway Lambda Proxy Output Format
 * 
 */
exports.lambdaHandler = async (event, context) => {
    try {
        const competencyId = event.pathParameters.competencyId;
        console.log(event.requestContext.authorizer.claims);

        let params = AWS.DynamoDB.QueryInput = {
            TableName: COMPETENCIES_DDB_TABLE_NAME,
            FilterExpression: "#userId = :id",
            ExpressionAttributeNames: {
                "#competencyId": "CompetencyId",
            },
            ExpressionAttributeValues: {
                ":id": competencyId,
            }
            
        }

        const queryStringParameters = event.queryStringParameters

        if (queryStringParameters != null && "ExclusiveStartKey" in queryStringParameters && queryStringParameters.ExclusiveStartKey != "") {
            params.ExclusiveStartKey = JSON.parse(Buffer.from(queryStringParameters.ExclusiveStartKey,'base64').toString('binary'));
       }

       if (queryStringParameters != null && "Limit" in queryStringParameters && queryStringParameters.Limit != "") {
            let limit = queryStringParameters.Limit;
            console.log("Limit: " + limit);
            //Validation if the limit is an actual number or not, and it must be positive or a 400 is returned
            if (isNaN(+limit) || +limit <= 0) {
                response = {
                    statusCode: 400,
                    body: "Limit must be a positive number if it is provided",
                    headers: {
                        'Access-Control-Allow-Origin': '*',
                    },
                }
                return response
            }
            params.Limit = +limit;
        }

		if (isEmptyObject(competencyId)) {
			response = {
				statusCode: 400,
				body: "This request is missing a necessary parameter - CompetencyId",
				headers: {
					'Access-Control-Allow-Origin': '*',
				},
			};
			return response;
		} else if (!/^\d+$/.test(competencyId)) {
			response = {
				statusCode: 400,
				body: "This request must contain a non-empty CompetencyId with only numeric characters. You entered : " + JSON.stringify(competencyId),
				headers: {
					'Access-Control-Allow-Origin': '*',
				},
			};
			return response;
		}

        // Check if an evaluation with the given parameters is in the database
        const competency = await getCompetency(params);

        let respBody = {};
        respBody.Items = allEvals.Items;

		//If the response didn't have an item in it (nothing was found in the database), return a 404 (not found)
        if (!("Item" in competency)) {
            response = {
                statusCode: 404,
                body: "A competency was not found with the given id  - " + JSON.stringify(competencyId),
                headers: {
                    'Access-Control-Allow-Origin': '*',
                },
            };
            return response;
        }

        response = {
            statusCode: 200,
            body: JSON.stringify(respBody),
            headers: {
                'Access-Control-Allow-Origin': '*',
            },
        }
    } catch (err) {
        console.log(err);
        return err;
    }

    return response;
};

/**
 * @param {Object} Params - the competencyId key that will be removed from the database
 * 
 * @returns {Object} object - a promise representing this delete request
 */
function getCompetency(params) {
    return ddb.scan(params).promise();
    // return ddb.get({
    //     TableName: COMPETENCIES_DDB_TABLE_NAME,
    //     Key: {
    //         "CompetencyId" : competencyId,
    //     }
    // }).promise();
}

/**
 * Checks if the provided JSON object is empty {} or not
 * @param {JSON} obj - The object to check for emptiness
 * 
 * @returns {boolean} True if this JSON object is empty, false if it is not empty
 */
function isEmptyObject(obj) {
    for (var key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            return false;
        }
    }
    return true;
}