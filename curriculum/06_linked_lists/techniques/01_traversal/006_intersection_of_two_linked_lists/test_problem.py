from list_node import ListNode
from solution import get_intersection_node


def build_list(values: list[int]) -> ListNode | None:
    dummy = ListNode()
    curr = dummy
    for value in values:
        curr.next = ListNode(value)
        curr = curr.next
    return dummy.next


def node_at(head: ListNode | None, index: int) -> ListNode | None:
    for _ in range(index):
        head = head.next
    return head


def test_get_intersection_node_overlap():
    shared = build_list([8, 4, 5])
    head_a = build_list([4, 1])
    node_at(head_a, 1).next = shared
    head_b = build_list([5, 6, 1])
    node_at(head_b, 2).next = shared

    assert get_intersection_node(head_a, head_b) is shared


def test_get_intersection_node_no_overlap():
    head_a = build_list([2, 6, 4])
    head_b = build_list([1, 5])

    assert get_intersection_node(head_a, head_b) is None
