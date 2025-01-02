
for file in tydance2/*.png; do
    ffmpeg -i "$file" -vf scale=960:540 "tydance2_540/$(basename "$file")"
done
#alternatively
ffmpeg -pattern_type glob -i "input_directory/somestem_*.png" -vf scale=960:540 "output_directory/somestem_%05d.png"


basisu -uastc -ktx2 -tex_array -multifile_printf  "vids/tydance2_540/ty_nudefreestyle_long_%05u.png" -multifile_first 1 -multifile_num 523 -output_file "tydance_540_texture_array.ktx2"


echo "Compression complete. Textures saved to $TEXTURE_DIR."
