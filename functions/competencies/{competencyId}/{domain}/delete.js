let response;

const auth = require('/opt/auth');
const AWS = require('aws-sdk');
const ddb = new AWS.DynamoDB.DocumentClient();
const COMPETENCIES_DDB_TABLE_NAME = process.env.COMPETENCIES_DDB_TABLE_NAME; // Allows us to access the environment variables defined in the Cloudformation template

const validRoles = ["Admin", "Faculty/Staff", "Coach", "Mentor"];
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
        let indicator = auth.verifyAuthorizerExistence(event);
        if (indicator != null) {
            return indicator;
        }
        indicator = auth.verifyValidRole(event, validRoles);
        if (indicator != null) {
            return indicator;
        }

        const requestBody = JSON.parse(event.body);

        const competencyId = event.pathParameters.competencyId;

        key = {
            "CompetencyId": competencyId,
            
        }

		if (isEmptyObject(key)) {
			response = {
				statusCode: 400,
				body: "This request is missing a necessary parameter - CompetencyId.",
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
        const getResponse = await getCompetency(key);

       
        //If the response didn't have an item in it (nothing was found in the database), return a 404 (not found)
        if (!("Item" in getResponse)) {
            response = {
                statusCode: 404,
                body: "A competency was not found with the given id  - " + competencyId,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                },
            };
            return response;
        }

        // Remove a competency from the database
        await removeCompetency(key);

        response = {
            statusCode: 204,
            body: "The competency with the following id has been deleted - " + competencyId,
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
 * @param {Object} key - the competencyId and domain key that will be removed from the database
 * 
 * @returns {Object} object - a promise representing this delete request
 */
function removeCompetency(key) {
    return ddb.delete({
        TableName: COMPETENCIES_DDB_TABLE_NAME,
        Key: key
    }).promise();
}

/**
 * @param {Object} key - the competencyId and domain key that will be removed from the database
 * 
 * @returns {Object} object - a promise representing this delete request
 */
function getCompetency(key) {
    return ddb.get({
        TableName: EVALUATIONS_DDB_TABLE_NAME,
        Key: key
    }).promise();
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