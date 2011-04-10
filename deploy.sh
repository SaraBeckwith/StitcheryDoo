cd source
zip -vr hello.zip * -x "*.DS_Store"
cd ..
mv source/hello.zip hello.zip
bbwp hello.zip
blackberry-deploy -installApp -password password -device 192.168.69.129 -package bin/hello.bar