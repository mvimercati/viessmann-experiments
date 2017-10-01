require 'rufus-scheduler'



cmds = {
"getTExtF"        => [nil,60],
"getTSan"         => [nil,5],
"getTTargetSan"   => [nil,60],
"getTempStp2"     => [nil,60],
"getTCald"        => [nil,5],
"getTempKsoll"    => [nil,60],
"getTempVLsollM1" => [nil,60],
"getTGas"         => [nil,15],
"getStartsCount"  => [nil,30],
"getBrucHours"    => [nil,60],
"getBrucPerc"     => [nil,5],
"getBrucStatLev"  => [nil,5],
"getTempRL17A"    => [nil,30],
"getTSolarColl"   => [nil,15],
"getTBoilerDown"  => [nil,5],
"getTBoilerUp"    => [nil,5],
"getStatusBoilerLoad" => [nil,5],
"getSolarPumpRPM"     => [nil,20],
"getRiscPumpRPM"      => [nil,20],
"getExtInputStatus"   => [nil,60],
"getSolarStunden"     => [nil,60],
"getSolarLeistung"    => [nil,60],
}


Rails.configuration.cmd_queue = Queue.new

scheduler = Rufus::Scheduler::singleton



m = Mutex.new

scheduler.every '5s' do
  # do stuff
  m.lock
  t = Time.now

  queue = []

  while Rails.configuration.cmd_queue.size > 0 do
    queue << Rails.configuration.cmd_queue.pop
  end

  cmds.each_pair do |k,v|


    if v[0].nil?
      queue << k
      cmds[k][0] = t
    else

      if (t - v[0]) > v[1]

        queue << k

        cmds[k][0] = t
        
      end

    end    

  end


  if queue.size > 0

    puts `vclient -h localhost -p 3002 "synchronize,#{queue.join(",")}"`
    

  end


  
  m.unlock
  
end
