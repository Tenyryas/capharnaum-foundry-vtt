export function handlebarsHelpers() {

        Handlebars.registerHelper('unlessEquals', function (arg1, arg2, options) {
                return (arg1 !== arg2) ? options.fn(this) : options.inverse(this);
        });



}