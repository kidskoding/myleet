from solution import NestedInteger, deserialize


def unpack(item: NestedInteger) -> int | list:
    if item.is_integer():
        return item.get_integer()
    return [unpack(child) for child in item.get_list()]


def test_deserialize_plain_integer():
    assert unpack(deserialize("324")) == 324


def test_deserialize_nested():
    assert unpack(deserialize("[123,[456,[789]]]")) == [123, [456, [789]]]


def test_deserialize_empty_list():
    assert unpack(deserialize("[]")) == []


def test_deserialize_negative_integer():
    assert unpack(deserialize("-3")) == -3


def test_deserialize_mixed_with_empty_inner_list():
    assert unpack(deserialize("[-1,[],[2,-30]]")) == [-1, [], [2, -30]]
