from solution import SQL


def make_sql():
    return SQL(["one", "two", "three"], [2, 3, 1])


def test_sql_example_one():
    sql = make_sql()
    assert sql.ins("two", ["first", "second", "third"]) is True
    assert sql.sel("two", 1, 3) == "third"
    assert sql.ins("two", ["fourth", "fifth", "sixth"]) is True
    assert sql.exp("two") == ["1,first,second,third", "2,fourth,fifth,sixth"]
    sql.rmv("two", 1)
    assert sql.sel("two", 2, 2) == "fifth"
    assert sql.exp("two") == ["2,fourth,fifth,sixth"]


def test_sql_example_two():
    sql = make_sql()
    assert sql.ins("two", ["first", "second", "third"]) is True
    assert sql.sel("two", 1, 3) == "third"
    sql.rmv("two", 1)
    assert sql.sel("two", 1, 2) == "<null>"
    assert sql.ins("two", ["fourth", "fifth"]) is False
    assert sql.ins("two", ["fourth", "fifth", "sixth"]) is True
    assert sql.exp("two") == ["2,fourth,fifth,sixth"]


def test_sql_unknown_table():
    sql = make_sql()
    assert sql.ins("four", ["a"]) is False
    sql.rmv("four", 1)
    assert sql.sel("four", 1, 1) == "<null>"
    assert sql.exp("four") == []


def test_sql_invalid_column():
    sql = make_sql()
    sql.ins("one", ["a", "b"])
    assert sql.sel("one", 1, 3) == "<null>"
    assert sql.sel("one", 1, 0) == "<null>"
    assert sql.sel("one", 2, 1) == "<null>"


def test_sql_ids_never_reused():
    sql = make_sql()
    sql.ins("three", ["x"])
    sql.rmv("three", 1)
    sql.rmv("three", 1)
    assert sql.exp("three") == []
    sql.ins("three", ["y"])
    assert sql.exp("three") == ["2,y"]
    assert sql.exp("one") == []
