/*
 Copyright Red Hat, Inc., and individual contributors

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
 */
module.exports = function(grunt) {
  'use strict';

  grunt.initConfig({
    _test_runner: '_mocha',
    _istanbul: 'istanbul cover --dir',
    _unit_args: '-A --recursive -t 10000 ./test/unit/',

    unit: '<%= _test_runner %> <%= _unit_args %>',
    unit_cover: '<%= _istanbul %> cov-unit <%= _test_runner %> -- <%= _unit_args %>'
  });

  grunt.loadNpmTasks('grunt-fh-build');
  grunt.registerTask('default', ['fh:default']);
};
