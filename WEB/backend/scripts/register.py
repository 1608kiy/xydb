import http.client, json
conn = http.client.HTTPConnection('localhost',8080)
payload = json.dumps({"nickname":"dev","email":"test@test.com","password":"password"})
headers = {'Content-Type':'application/json'}
conn.request('POST','/api/auth/register',payload,headers)
res = conn.getresponse()
print(res.status, res.reason)
print(res.read().decode())
