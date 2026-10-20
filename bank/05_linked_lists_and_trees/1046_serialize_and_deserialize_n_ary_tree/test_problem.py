from solution import Codec, Node


def tree(val, *children):
    return Node(val, list(children))


def shape(node):
    if node is None:
        return None
    return (node.val, [shape(c) for c in node.children])


def round_trip(root):
    codec = Codec()
    data = codec.serialize(root)
    assert isinstance(data, str)
    return Codec().deserialize(data)


def test_codec_three_levels():
    root = tree(1, tree(3, tree(5), tree(6)), tree(2), tree(4))
    assert shape(round_trip(root)) == shape(root)


def test_codec_wide_and_deep():
    root = tree(
        1,
        tree(2),
        tree(3, tree(6), tree(7, tree(11, tree(14)))),
        tree(4, tree(8, tree(12))),
        tree(5, tree(9, tree(13)), tree(10)),
    )
    assert shape(round_trip(root)) == shape(root)


def test_codec_empty_tree():
    assert round_trip(None) is None


def test_codec_single_node():
    assert shape(round_trip(tree(42))) == (42, [])


def test_codec_negative_and_multi_digit_values():
    root = tree(-10, tree(1000), tree(-1, tree(0)))
    assert shape(round_trip(root)) == shape(root)


def test_codec_long_chain():
    root = tree(0)
    node = root
    for v in range(1, 60):
        child = tree(v)
        node.children.append(child)
        node = child
    assert shape(round_trip(root)) == shape(root)
