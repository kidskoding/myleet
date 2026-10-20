from list_node import ListNode
from solution import insert


def build_ring(values: list[int]) -> ListNode | None:
    if not values:
        return None
    nodes = [ListNode(v) for v in values]
    for a, b in zip(nodes, nodes[1:] + nodes[:1]):
        a.next = b
    return nodes[0]


def read_ring(head: ListNode, expected_length: int) -> list[int]:
    values = []
    node = head
    for _ in range(expected_length):
        values.append(node.val)
        node = node.next
    assert node is head
    return values


def assert_sorted_ring(values: list[int], expected: list[int]) -> None:
    target = sorted(expected)
    assert any(values[i:] + values[:i] == target for i in range(len(values)))


def test_insert_between_min_and_head():
    head = build_ring([3, 4, 1])
    result = insert(head, 2)
    assert result is head
    assert read_ring(result, 4) == [3, 4, 1, 2]


def test_insert_into_empty_list():
    result = insert(None, 1)
    assert read_ring(result, 1) == [1]


def test_insert_new_minimum_into_single_node():
    head = build_ring([1])
    result = insert(head, 0)
    assert result is head
    assert read_ring(result, 2) == [1, 0]


def test_insert_new_maximum_at_wrap_point():
    head = build_ring([3, 5, 1])
    result = insert(head, 6)
    assert result is head
    assert read_ring(result, 4) == [3, 5, 6, 1]


def test_insert_into_all_equal_values():
    head = build_ring([3, 3, 3])
    result = insert(head, 0)
    assert result is head
    assert_sorted_ring(read_ring(result, 4), [3, 3, 3, 0])


def test_insert_duplicate_value():
    head = build_ring([2, 2, 4, 1])
    result = insert(head, 2)
    assert result is head
    assert_sorted_ring(read_ring(result, 5), [2, 2, 4, 1, 2])
