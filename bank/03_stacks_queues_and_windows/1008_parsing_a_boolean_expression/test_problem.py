from solution import parse_bool_expr


def test_parse_bool_expr_nested_and_or():
    assert parse_bool_expr("&(|(f))") is False


def test_parse_bool_expr_or_many():
    assert parse_bool_expr("|(f,f,f,t)") is True


def test_parse_bool_expr_not_of_and():
    assert parse_bool_expr("!(&(f,t))") is True


def test_parse_bool_expr_bare_literals():
    assert parse_bool_expr("t") is True
    assert parse_bool_expr("f") is False


def test_parse_bool_expr_deep_mix_false():
    assert parse_bool_expr("|(&(t,f,t),!(t))") is False


def test_parse_bool_expr_deep_mix_true():
    assert parse_bool_expr("&(t,!(f),|(f,&(t,t)))") is True
