SELECT current_database() AS db,
       current_user AS role,
       inet_server_addr() AS host,
       inet_server_port() AS port;
