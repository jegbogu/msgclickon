# api/queue.py
from redis import Redis
from rq import Queue, Retry

redis_conn = Redis(host="localhost", port=6379)
message_queue = Queue("messages", connection=redis_conn)