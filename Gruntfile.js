module.exports = function(grunt) {
  'use strict';

  grunt.initConfig({
  //stuff
  });

  grunt.loadNpmTasks('grunt-fh-build');
  grunt.registerTask('default', ['fh:default']);
};
