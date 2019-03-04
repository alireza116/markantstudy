import csv
import json
with open("topic1.csv",encoding="UTF-8") as csvFile:
    csvReader = csv.DictReader(csvFile)
    data = [i for i in csvReader if i["sentiment"] != "" and i["claim"] not in ["","no score"]]

with open("topicscsv.csv",encoding="UTF-8") as csvFile:
    csvReader = csv.DictReader(csvFile)
    topics = [i for i in csvReader]

topic = topics[0]
topic["data"] = data
with open("topic1.json","w",encoding="UTF-8") as jsonFile:
    jsonFile.write(json.dumps(topic))

with open("topic2.csv",encoding="UTF-8") as csvFile:
    csvReader = csv.DictReader(csvFile)
    data = [i for i in csvReader if i["sentiment"] != "" and i["claim"] not in ["","no score"]]

topic = topics[1]
topic["data"] = data
with open("topic2.json","w",encoding="UTF-8") as jsonFile:
    jsonFile.write(json.dumps(topic))