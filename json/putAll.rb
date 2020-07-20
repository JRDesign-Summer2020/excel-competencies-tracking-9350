require 'aws-sdk-dynamodb'  # v2: require 'aws-sdk'
require 'json'

# Create dynamodb client in us-west-2 region
dynamodb = Aws::DynamoDB::Client.new(region: 'us-east-1')

# choose your json file 
file = File.read('evaluationScale.json')
# name for all items (i.e movies)
scales = JSON.parse(file)
#name for one item (i.e movie)
scales.each{|scale|

  params = {
    #name of table you want to write to
    table_name: 'EvaluationScale',
    item: scale
  }

  begin
    dynamodb.put_item(params)

  rescue  Aws::DynamoDB::Errors::ServiceError => error
    #error message
    puts 'Unable to add competency'
    puts error.message
  end
}