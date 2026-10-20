from solution import MultilevelNode, flatten


def flatten_to_list(head: MultilevelNode | None) -> list[int]:
    values = []
    while head:
        values.append(head.val)
        head = head.next
    return values


def test_flatten_multilevel():
    # 1 - 2 - 3 - 4
    #         |
    #         5 - 6
    nodes = [MultilevelNode(i) for i in range(1, 7)]
    nodes[0].next = nodes[1]
    nodes[1].prev = nodes[0]
    nodes[1].next = nodes[2]
    nodes[2].prev = nodes[1]
    nodes[2].next = nodes[3]
    nodes[3].prev = nodes[2]
    nodes[2].child = nodes[4]
    nodes[4].next = nodes[5]
    nodes[5].prev = nodes[4]

    result = flatten(nodes[0])
    assert flatten_to_list(result) == [1, 2, 3, 5, 6, 4]

    # prev links should be consistent and no child pointers remain
    curr = result
    prev = None
    while curr:
        assert curr.prev is prev
        assert curr.child is None
        prev = curr
        curr = curr.next


def test_flatten_empty():
    assert flatten(None) is None
