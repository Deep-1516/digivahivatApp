#!/usr/bin/env ruby
require 'xcodeproj'

project_path = File.join(__dir__, 'falomobileapp.xcodeproj')
project = Xcodeproj::Project.open(project_path)

# Find the main target
target = project.targets.find { |t| t.name == 'falomobileapp' }
abort("Target 'falomobileapp' not found") unless target

# Find the Fonts group inside falomobileapp
main_group = project.main_group.children.find { |g| g.display_name == 'falomobileapp' }
abort("Main group 'falomobileapp' not found") unless main_group

fonts_group = main_group.children.find { |g| g.display_name == 'Fonts' }
unless fonts_group
  puts "No Fonts group found — nothing to remove."
  exit 0
end

# Remove all font file references from the "Copy Bundle Resources" build phase
resources_phase = target.resources_build_phase
removed_count = 0

fonts_group.children.each do |file_ref|
  build_file = resources_phase.files.find { |f| f.file_ref == file_ref }
  if build_file
    resources_phase.files.delete(build_file)
    removed_count += 1
    puts "Removed from resources: #{file_ref.display_name}"
  end
end

# Remove the Fonts group itself (and its file references)
fonts_group.remove_from_project
puts "\nRemoved Fonts group from project."
puts "Total files removed from build phase: #{removed_count}"

project.save
puts "Xcode project saved successfully!"
