from google.cloud import firestore
from pyspark.sql import SparkSession
import json
import os
os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = "./key.json"

# Tạo kết nối đến Firestore
db = firestore.Client(database = "alittledaisydatabase")

# Truy vấn dữ liệu từ Firestore
def fetch_data_from_firestore(collection_name):
    docs = db.collection(collection_name).stream()
    data = [doc.to_dict() for doc in docs]
    return data

spark = SparkSession.builder \
  .appName("FirestoreToHadoop") \
  .getOrCreate()

# Đọc dữ liệu từ Firestore
collection_name = "Student"
data = fetch_data_from_firestore(collection_name)

# Chuyển đổi dữ liệu thành DataFrame của Spark
df_spark = spark.read.json(spark.sparkContext.parallelize([json.dumps(doc) for doc in data]))

# Lưu DataFrame vào HDFS
hdfs_path = "hdfs://10.140.0.2:9000/usr/nguyenvietkhiemm"
df_spark.write.parquet(hdfs_path, mode="overwrite")
df_spark.show()

print("Data written to HDFS successfully")

# Dừng Spark session
spark.stop()
