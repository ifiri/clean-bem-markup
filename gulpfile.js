var argv         = require('minimist')(process.argv.slice(2)); // parse argument options
var gulp         = require('gulp');
var gulpif       = require('gulp-if'); // полезная хрень, условия прямо посреди pipeline
var merge        = require('merge-stream'); // позволяет объединять потоки в бандл и работать с ними как с одним
var rev          = require('gulp-rev'); // добавляет хэш ревизии к собираемым файлам
var concat       = require('gulp-concat'); // склеивает файлы
var del          = require('del'); // удаляет файлы и папки
var autoprefixer = require('gulp-autoprefixer');
var css_nano     = require('gulp-cssNano'); // minify CSS with css_nano
var sass         = require('gulp-sass');
var sourcemaps   = require('gulp-sourcemaps');
var mmq          = require('gulp-merge-media-queries');
var jshint       = require('gulp-jshint'); // зависим от jshint
var uglify       = require('gulp-uglify');
var changed      = require('gulp-changed'); // only pass through changed files since last run
var imagemin     = require('gulp-imagemin');
var spritesmith  = require('gulp.spritesmith'); // кузница растровых спрайтов
var svg_sprites  = require('gulp-svg-sprites'); // генератор svg спрайтов
var pug          = require('gulp-pug'); // преобразует pug-шаблоны в html
var rename       = require('gulp-rename'); // враппер для быстрого переименования файлов
var inject       = require('gulp-inject'); // подключает файлы в шаблон инлайново
var task_time    = require('gulp-total-task-time');

// var plumber      = require('gulp-plumber'); // предназначен для перехвата ошибок при выполнении тасков и вывода информации о них в удобоваримом виде, не прерывая работу gulp (особенно критично при gulp watch)
// var flatten = require('gulp-flatten'); // эта херня, как я понял, преобразует относительные пути в пути относительно некой директории

task_time.init();

// See https://github.com/austinpray/asset-builder/blob/master/help/spec.md
// а эта малафья управляет зависимостями в манифест-файле
var manifest = require('asset-builder')('./assets/manifest.json');

// Globs of dependencies by type, can be used in gulp.src
var globs = manifest.globs;
var paths = manifest.paths;

// Paths to first-party assets by type. This is files that included in compiled files.
var project = manifest.getProjectGlobs();
var config = manifest.config || {};

var rev_manifest = paths.dist + 'assets.json';
var is_production = argv.production;


/**
 * ==================================
 * TASK HANDLERS
 * ==================================
 */
function task_clean() {
    if(is_production) {
        return del([paths.dist]);
    }

    return null;
}

function task_styles() {
    var globs = get_globs_for('css');
    var merged = merge();

    for(var filename in globs) {
        merged.add(
            _do_styles_task_for(filename, globs)
        );
    }

    return merged;
}

function task_jslint() {
    var stream = gulp.src(project.js)
        .pipe(jshint())
        .pipe(jshint.reporter('jshint-stylish'))
        .pipe(jshint.reporter('fail'));

    return stream;
}

function task_scripts() {
    var globs = get_globs_for('js');
    var merged = merge();

    for(var filename in globs) {
        merged.add(
            _do_scripts_task_for(filename, globs)
        );
    }

    return merged;
}

function task_fonts() {
    var font_globs = get_globs_for('fonts');
    
    var stream = gulp.src(font_globs)
        .pipe(gulp.dest(get_path_to('dist', 'fonts')))

    return stream;
}

function task_wiredep() {
    var wiredep = require('wiredep').stream;

    return gulp.src(project.css)
    .pipe(wiredep())
    .pipe(changed(get_path_to('source', 'styles'), {
        hasChanged: changed.compareSha1Digest
    }))
    .pipe(gulp.dest(get_path_to('source', 'styles')));
}

function task_rename() {
    var stream = gulp.src(['*.html', './*.html'])
        .pipe(rename(function(path) {
            path.extname = ".php";

            return path;
        }))
        .pipe(gulp.dest('.'));

    return stream;
}

function task_delete_html() {
    del(['*.html', './*.html']);
}

function task_inject() {
    task_delete_html();

    var stream = gulp.src(['*.php'])
        .pipe(inject(
            gulp.src(['./dist/images/sprite.svg']), 
            {
                starttag: '<!-- inject:{{ext}} -->',
                transform: function (filePath, file) {
                    // return file contents as string 
                    return file.contents.toString('utf8')
                }
            }
        ))
        .pipe(gulp.dest('.'));

    return stream;
}

function task_templates() {
    var stream = gulp.src(config.paths.templates + '/*.*')
        .pipe(pug({
            pretty: true
        }))
        .pipe(gulp.dest('.'))

    return stream;
}

function task_images() {
    var images_globs = globs.images;

    images_globs.push('!' + get_path_to('source', 'sprites') + '/**/*.*');
    images_globs.push('!' + get_path_to('source', 'sprites') + '/**');
    images_globs.push('!' + get_path_to('source', 'sprites'));

    var stream = gulp.src(images_globs)
    .pipe((function() {
        return gulpif('!*.svg', imagemin());
    })())
    .pipe(gulp.dest(get_path_to('dist', 'images')));

    return stream;
}

function task_sprites() {
    var merged = merge();

    merged.add(task_sprites_png());
    merged.add(task_sprites_svg());

    return merged;
}

function task_sprites_png() {
    var stream = gulp.src(get_path_to('source', 'sprites') + '/**/*.+(png|jpg)')
        .pipe(spritesmith({
            imgName: config.paths.images + '/' + config.sprites.png.imagename,
            cssName: config.paths.styles + '/' + config.sprites.png.cssname
        }))
        .pipe(gulp.dest(paths.source))

    return stream;
}

function task_sprites_svg() {
    var stream = gulp.src(get_path_to('source', 'sprites') + '/**/*.svg')
        .pipe(svg_sprites({
            cssFile: config.paths.styles + '/' + config.sprites.svg.cssname,
            svg: {
                sprite: config.paths.images + '/' + config.sprites.svg.imagename,
                defs: config.paths.images + '/' + config.sprites.svg.imagename,
                symbols: config.paths.images + '/' + config.sprites.svg.imagename
            },
            preview: false,
            mode: 'symbols', // css only in sprite mode
        }))
        // .pipe(svg_sprite({
        //     dest: '.', //config.paths.styles + '/' + config.sprites.svg.cssname,
        //     // svg: {
        //     //     sprite: config.paths.images + '/' + config.sprites.svg.imagename,
        //     //     defs: config.paths.images + '/' + config.sprites.svg.imagename,
        //     //     symbols: config.paths.images + '/' + config.sprites.svg.imagename
        //     // },
        //     // mode: 'symbol', // css only in sprite mode
        //     mode                : {
        //         symbol: {
        //             dest: '.',
        //             sprite: config.paths.images + '/' + config.sprites.svg.imagename
        //         }
        //     },
        //     shape: {
        //         transform: []
        //     }
        // }))
        .pipe(gulp.dest(paths.source))

    return stream;
}


/**
 * ==================================
 * TASK FUNCTIONS
 * ==================================
 */
function _do_styles_task_for(filename, globs) {
    return gulp.src(globs[filename])
        // .pipe((function() {
        //     return gulpif(!is_production, sourcemaps.init());
        // })())
        .pipe(sass())
        .pipe(concat(filename))
        .pipe(autoprefixer({
            browsers: [
                'last 5 versions',
                'android 4',
                'opera 12'
            ]
        }))
        .pipe(mmq({
            log: true
        }))
        .pipe(css_nano({
            safe: true
        }))
        .pipe((function() {
            return gulpif(is_production, rev());
        })())
        // .pipe((function() {
        //     return gulpif(!is_production, sourcemaps.write('.', {
        //         sourceRoot: get_path_to('sourse', 'styles')
        //     }));
        // })())
        .pipe(gulp.dest(get_path_to('dist', 'styles')))
        .pipe(rev.manifest(rev_manifest, {
            base: paths.dist,
            merge: true
        }))
        .pipe(gulp.dest(paths.dist));
}

function _do_scripts_task_for(filename, globs) {
    return gulp.src(globs[filename])
        .pipe(concat(filename))
        .pipe(uglify())
        .pipe((function() {
            return gulpif(is_production, rev());
        })())
        .pipe(gulp.dest(get_path_to('dist', 'scripts')))
        .pipe(rev.manifest(rev_manifest, {
            base: paths.dist,
            merge: true
        }))
        .pipe(gulp.dest(paths.dist));
}


/**
 * ==================================
 * HELPING FUNCTIONS
 * ==================================
 */
function get_path_to(endpoint, asset_type) {
    return paths[endpoint] + config.paths[asset_type] + '/';
}

function get_globs_for(globname, expanded) {
    if(!expanded) {
        var expanded = false;
    }

    var output = [];

    for(var i in globs[globname]) {
        var current_globs = globs[globname][i];

        if(typeof current_globs === 'object' && 'name' in current_globs) {
            var dep_dist_file = current_globs['name'];
            var globs_deps = current_globs['globs'];

            if(!expanded) {
                output[dep_dist_file] = globs_deps;
            } else {
                output[dep_dist_file] = get_globs_for(globs_deps);
            }

            // console.log("globs: %j", output[dep_dist_file]);
            // console.log(output);
            // console.log("globs: %j", globs_deps);
        } else {
            output[i] = current_globs;
        }
    }



    return output;
}


/**
 * ==================================
 * TASKS DEFINITION
 * ==================================
 */
gulp.task('clean', task_clean);

gulp.task('wiredep', task_wiredep);
gulp.task('styles', ['wiredep'], task_styles);
gulp.task('jslint', task_jslint);
gulp.task('scripts', ['jslint'], task_scripts);
gulp.task('fonts', task_fonts);
gulp.task('images', task_images);
gulp.task('sprites', task_sprites);
gulp.task('sprites:png', task_sprites_png);
gulp.task('sprites:svg', task_sprites_svg);
gulp.task('templates:rename', task_rename);
gulp.task('templates:inject', ['templates:rename'], task_inject);
gulp.task('templates:compile', task_templates);
gulp.task('templates', ['templates:compile'], function() {
    gulp.start(['templates:inject']);
});

gulp.task('common', ['styles', 'templates']);

gulp.task('build', ['sprites'], function() {
    gulp.start(['fonts', 'styles', 'scripts', 'images', 'templates']);
});

gulp.task('default', ['clean'], function() {
    gulp.start('build');
});