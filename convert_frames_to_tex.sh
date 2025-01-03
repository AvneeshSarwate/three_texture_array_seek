
# for file in tydance2/*.png; do
#     ffmpeg -i "$file" -vf scale=960:540 "tydance2_540/$(basename "$file")"
# done
# #alternatively
# ffmpeg -pattern_type glob -i "input_directory/somestem_*.png" -vf scale=960:540 "output_directory/somestem_%05d.png"

# ffmpeg -pattern_type glob -i "aroma/*.png" -vf scale=960:540 "aroma_540/%05d.png"


# basisu -uastc -ktx2 -tex_array -multifile_printf  "vids/tydance2_540/ty_nudefreestyle_long_%05u.png" -multifile_first 1 -multifile_num 523 -output_file "tydance_540_texture_array.ktx2"


# echo "Compression complete. Textures saved to $TEXTURE_DIR."


##########################################################################################
##########################################################################################

#takes a dir with subdirs that have png sequences and converts them to 540p

# # Check if directory argument is provided
# if [ $# -lt 1 ]; then
#     echo "Usage: $0 <directory>"
#     exit 1
# fi

# # Get the target directory from command line argument
# target_dir="$1"

# # Check if directory exists
# if [ ! -d "$target_dir" ]; then
#     echo "Error: Directory $target_dir does not exist"
#     exit 1
# fi

# # Loop through all subdirectories in target directory
# for dir in "$target_dir"/*/; do
#     # Skip if directory already ends in _540
#     if [[ $dir != *"_540/" ]]; then
#         # Remove trailing slash for directory name
#         dirname=${dir%/}
#         # Create new _540 directory
#         mkdir -p "${dirname}_540"
#         # Run ffmpeg command for this directory
#         ffmpeg -pattern_type glob -i "${dirname}/*.png" -vf scale=960:540 "${dirname}_540/%05d.png"
#     fi
# done

##########################################################################################
##########################################################################################

#!/bin/bash

# Check if directory argument is provided
if [ $# -lt 1 ]; then
    echo "Usage: $0 <directory>"
    exit 1
fi

# Get the target directory from command line argument
target_dir="$1"

# Check if directory exists
if [ ! -d "$target_dir" ]; then
    echo "Error: Directory $target_dir does not exist"
    exit 1
fi

for dir in "$target_dir"/*; do
    # Skip if not a directory
    [ ! -d "$dir" ] && continue
    
    # Remove trailing slash - (will be string like "target_dir/dirname")
    dirname=${dir%/}
    
    # Count total number of files in directory
    numfiles=$(ls -1 "${dirname}" | wc -l)
    
    if [ $numfiles -gt 0 ]; then
        echo "Processing ${dirname} with $numfiles files..."
        
        # Assembled command
        cmd="basisu -uastc -ktx2 -tex_array -multifile_printf \"${dirname}/%05u.png\" \
            -multifile_first 1 -multifile_num $numfiles \
            -output_file \"${dirname}_texture_array.ktx2\""

        #this writes into target_dir because dirname is a string like "target_dir/dirname"

        # Print the command for debugging
        echo "Executing command: $cmd"
        
        # Run the command
        eval $cmd
    else
        echo "No files found in ${dirname}"
    fi
done





# basisu -uastc -ktx2 -tex_array -multifile_printf  "short_540/aroma_540/%05u.png" -multifile_first 1 -multifile_num 36 -output_file "short_540/aroma_540_texture_array.ktx2"