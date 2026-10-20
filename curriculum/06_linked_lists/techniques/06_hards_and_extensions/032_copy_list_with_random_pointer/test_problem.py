from solution import RandomNode, copy_random_list


def build_random_list(values: list[int], randoms: list[int | None]) -> RandomNode | None:
    if not values:
        return None
    nodes = [RandomNode(value) for value in values]
    for i in range(len(nodes) - 1):
        nodes[i].next = nodes[i + 1]
    for i, target in enumerate(randoms):
        nodes[i].random = nodes[target] if target is not None else None
    return nodes[0]


def test_copy_random_list_is_deep_copy():
    original = build_random_list([7, 13, 11, 10, 1], [None, 0, 4, 2, 0])
    clone = copy_random_list(original)

    orig_nodes, clone_nodes = [], []
    o, c = original, clone
    while o:
        orig_nodes.append(o)
        clone_nodes.append(c)
        o, c = o.next, c.next

    assert [n.val for n in clone_nodes] == [n.val for n in orig_nodes]
    for oc in clone_nodes:
        assert oc not in orig_nodes
    for i, o in enumerate(orig_nodes):
        if o.random is None:
            assert clone_nodes[i].random is None
        else:
            assert clone_nodes[i].random is clone_nodes[orig_nodes.index(o.random)]


def test_copy_random_list_empty():
    assert copy_random_list(None) is None
