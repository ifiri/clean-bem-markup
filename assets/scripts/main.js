function add_leading_zero(number) {
    return '0' + number + '';
}

function is_property_supported(property) {
    return property in document.body.style;
}

// main
$(document).ready(function() {
    var $body = $('body');


    // Support
    if(is_property_supported('object-fit')) {
        $body.addClass('support_object-fit_true');
    } else {
        $body.addClass('support_object-fit_false');
    }


    // Utils
    $('a[href="#"]').on('click', function(e) {
        e.preventDefault();
    });


    // Accordion Menu
    $('[data-accordion]').each(function() {
        var $accordion = $(this);
        var $accordion_trigger = $accordion.find('[data-accordion-trigger]');
        var $accordion_content = $accordion.find('[data-accordion-content]');

        if(!$accordion_trigger.length) {
            $accordion_trigger = $accordion;
        }

        $accordion_trigger.on('click', function() {
            var is_opened = $(this).attr('data-accordion-opened');

            if(!is_opened) {
                $accordion_content.slideDown('fast');
                $(this).attr('data-accordion-opened', true);
            } else {
                $accordion_content.slideUp('fast');
                $(this).removeAttr('data-accordion-opened');
            }
        });
    });


    // Triggers
    $('[data-trigger]').each(function() {
        var $trigger = $(this);
        var trigger_type = $trigger.attr('data-trigger');
        var $target = $('#' + trigger_type);

        var event_handler = null;

        function _handler_mini_cart() {
            if($target.length) {
                var state = $target.attr('data-state');

                if(!state || state === 'invisible') {
                    state = 'visible';
                } else {
                    state = 'invisible';
                }

                $target.attr('data-state', state);
            }
        }

        function _handler_aside_panel() {
            if($target.length) {
                var state = $target.attr('data-state');

                if(!state || state === 'invisible') {
                    state = 'visible';
                } else {
                    state = 'invisible';
                }

                $target.attr('data-state', state);
            }
        }

        switch(trigger_type) {
            case 'mini-cart':
                var $pointer = $target.find('.cart__pointer');

                var pointer_x = Math.round($trigger.offset().left - $target.offset().left + (Math.abs($trigger.width() - $pointer.outerWidth()) / 2));
                $pointer.css('left', pointer_x + 'px');

                event_handler = _handler_mini_cart;
                break;

            case 'aside-panel':
                event_handler = _handler_aside_panel;
                break;
        }

        $trigger.on('click', event_handler);
    });


    // Dismissiables
    $('[data-dismiss]').on('click', function() {
        var dismissable_id = $(this).attr('data-dismiss');
        var $dismissable = $('#' + dismissable_id);

        if($dismissable.length) {
            var state = $dismissable.attr('data-state');

            if(!state || state === 'invisible') {
                state = 'visible';
            } else {
                state = 'invisible';
            }

            $dismissable.attr('data-state', state);
        }
    });


    // Sliders
    $('.slider').each(function(i) {
        var $container = $(this);
        var $slider_element = $container.find('.slider__inner');
        var $counter_element = $container.find('.counter');

        var config = {
            autoplay: false,
            slidesToShow: 1,
            arrows: false,
            dots: false,
            pauseOnHover: false, 
            pauseOnFocus: false,
            variableWidth: false,
            adaptiveHeight: false,
            appendDots: $container,
            appendArrows: $container.find('.slider__arrows'),
            dotsClass: 'slider__dots',
            customPaging : function(slider, i) {
                return '<a class="slider__dot"></a>';
            },
        };

        for(var option in config) {
            var attribute = 'data-' + option;
            var final_option = config[option];

            var overwritten_option = $container.attr(attribute);

            if(overwritten_option) {
                overwritten_option = overwritten_option.toLowerCase();

                var is_number = parseInt(overwritten_option, 10);

                if(typeof is_number === 'number' && !isNaN(is_number)) {
                    overwritten_option = is_number;
                } else if(overwritten_option === 'true' || overwritten_option === 'false') {
                    overwritten_option = (overwritten_option === 'true');
                }

                if(option === 'appendArrows' || option === 'appendDots') {
                    var $target = $(overwritten_option);

                    if($target.length) {
                        $counter_element = $target.find('.counter');

                        final_option = $target;
                    }
                } else {
                    final_option = overwritten_option;
                }

                config[option] = final_option;
            }
        }

        config.prevArrow = config.appendArrows.find('.arrows__arrow_prev');
        config.nextArrow = config.appendArrows.find('.arrows__arrow_next');

        if($counter_element.length) {
            var $counter__current = $counter_element.find('.counter__current');
            var $counter__count = $counter_element.find('.counter__count');

            $slider_element.on('init reInit', function(e, slick) {
                $counter__count.text(add_leading_zero(slick.slideCount));
            });

            $slider_element.on('beforeChange', function(e, slick, currentSlide, nextSlide) {
                $counter__current.text(add_leading_zero(nextSlide + 1));
            });
        }

        $slider_element.slick(config);
    });
});