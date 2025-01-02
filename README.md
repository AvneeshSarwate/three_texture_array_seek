to start, run `npm install` and then `npm run dev`, and go to the url printed in the terminal.

also, you'll have to download the file https://www.dropbox.com/scl/fi/sujmbc7jmb7ae1boqy4bc/tydance_540_texture_array.ktx2?rlkey=ojyshk12n2mvlonzfva8jca3a&dl=0
and place it in the `public` folder (because it's too big to add to the repo).





to convert videos, see the shell scripts included. 
they use ffmpeg to convert videos to png sequences, 
and https://github.com/BinomialLLC/basis_universal to convert the png sequences 
to compressed texture arrays. 

the basisu tool can be installed via homebrew on macos.
