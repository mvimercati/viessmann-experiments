#!/usr/bin/ruby

while 1 do
  puts Time.now
 `vclient -h localhost  --port 3002 -f list -s csv`
  
end
