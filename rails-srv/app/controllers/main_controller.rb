# coding: utf-8
class MainController < ApplicationController

  def index


    Rails.configuration.cmd_queue << "setTTargetSan #{params[:t]}"
    
  end

  
  def index2

    out = `/root/vclient.call 2>&1`

    @s={}

    current = nil
    
    out.each_line do |line|

      puts line

      
      
      if line =~ /(.*):/
      
        current = $1

      elsif line =~ /([-\d.]+)\s?(.*)?/ and current

        if $1.to_f.round(2).to_s.end_with?(".0") and $2 != "°C"
          
          @s[current] = $1.to_f.round(0).to_s + " " + $2
          
        else

          @s[current] = $1.to_f.round(2).to_s + " " + $2
          
        end
        
        current = nil
      end
      
    end

    
    respond_to do |format|
      format.html
      format.json { render json: @s }

    end



    
  end


  def getOutput
  
    output = {}


    out = `/root/vclient.call 2>&1`


    out.each_line do |line|

      if line =~ /(.*)\.value ([\d\.]+)/

        output[$1] = $2.to_f.round(2).to_s

      end

    end

    

    respond_to do |format|

      format.json { render json: output }

    end

    

  end

  
end
